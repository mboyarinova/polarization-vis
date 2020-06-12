# data cleaning script for data downloaded from VoteView
# to run, navigate to ./scaffold/app/data and
# enter the command 'python3 data_cleaning.py' in your terminal

import pandas as pd

def go(filename, hexmap):
    df = pd.read_csv(filename, usecols  = ['congress', 'state_abbrev', 
        'party_code', 'nominate_dim1'])
    hexmapdf = pd.read_csv(hexmap)

    # use data from 15 terms, exclude current congressional term b/c it's incomplete
    df = df[(df['congress'] < 115) & (df['congress'] > 115 - 15 - 1)]
    # exclude the President
    df = df[df['state_abbrev'] != 'USA']
    # restict to two main parties
    df.loc[df['party_code'] == 100, 'party_code'] = 'D'
    df.loc[df['party_code'] == 200, 'party_code'] = 'R'
    df = df[(df['party_code'] == 'D') | (df['party_code'] == 'R')]
    df.dropna(inplace = True)
    
    # consolidate all DW-NOMINATE scores for each party in each term into a list
    density_df = df.groupby(['congress', 'party_code'])['nominate_dim1'].apply(list).reset_index()

    R_df = density_df.loc[density_df['party_code'] == 'R']
    R_df.drop(columns = 'party_code', inplace = True)
    R_df.columns = ['congress', 'R_nominate_dim1']

    D_df = density_df.loc[density_df['party_code'] == 'D']
    D_df.drop(columns = 'party_code', inplace = True)
    D_df.columns = ['congress', 'D_nominate_dim1']

    densitydf = R_df.merge(D_df, on = 'congress')

    scatterplot_df = df.groupby(['congress', 'party_code'])['nominate_dim1'].median().abs().reset_index()
    scatterplot_df = scatterplot_df.groupby(['congress'])['nominate_dim1'].sum().reset_index()
    scatterplot_df['polarization_percentage'] = (scatterplot_df['nominate_dim1'] / 2) * 100
    scatterplot_df.drop(columns = 'nominate_dim1', inplace = True)

    # add term years
    for data in (densitydf, scatterplot_df):
        data['starting_yr'] = 1987 + 2 * (data['congress'] - 100)
        data['ending_yr'] = data['starting_yr'] + 2
        data['year'] = data['starting_yr'].astype(str) + '-' + data['ending_yr'].astype(str).str[-2:]

    densitydf.to_csv('density_data.csv', index = False)
    scatterplot_df.to_csv('scatterplot_df_data.csv', index = False)

    current_scores = df[df['congress'] == max(df['congress'])].groupby('state_abbrev').median().reset_index()
    current_scores.drop(columns = 'congress', inplace = True)
    current_scores.columns = ['state_abbrev', 'current_score']

    map_df = df[(df['congress'] == min(df['congress'])) | (df['congress'] == max(df['congress']))]
    map_df = map_df.groupby(['congress', 'state_abbrev'])['nominate_dim1'].median().abs().reset_index()
    map_df.sort_values(['state_abbrev'], inplace=True)
    map_df['change'] = map_df['nominate_dim1'].diff()

    map_df = map_df[map_df['congress'] == 114]
    map_df = map_df.merge(current_scores, on = 'state_abbrev')
    map_df.drop(columns = ['congress', 'nominate_dim1'], inplace = True)
    map_df.columns = ['StateAbbr', 'extremism_change', 'current_score']
    map_average = pd.Series(['US', map_df['extremism_change'].median(), map_df['current_score'].median()]
        ,index=['StateAbbr', 'extremism_change', 'current_score'])
    map_df = map_df.append(map_average, ignore_index=True)

    for col in hexmapdf.columns: # remove old data
        if col not in ('StateAbbr', 'StateName', 'HexRow', 'HexCol'):
            hexmapdf.drop(columns = col, inplace = True)
    completehexmapdf = hexmapdf.merge(map_df, on = 'StateAbbr')
    completehexmapdf.to_csv('hexmap.csv', index = False)


if __name__ == '__main__':
    go('Hall_members.csv', 'hexmap.csv')
