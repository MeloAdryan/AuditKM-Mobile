import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import type {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import DashboardCard from '../components/DashboardCard';
import EmptyState from '../components/EmptyState';
import ScreenHeader from '../components/ScreenHeader';
import StatusBadge from '../components/StatusBadge';

import { useAuth } from '../contexts/AuthContext';

import type {
  RootStackParamList,
} from '../navigation/AppNavigator';

import {
  getDashboard,
} from '../services/dashboard';

import type {
  RouteAudit,
} from '../types/audit';

import type {
  DashboardData,
} from '../types/dashboard';


type Props = NativeStackScreenProps<
  RootStackParamList,
  'Dashboard'
>;


function formatKm(
  value: number | string,
) {
  const numericValue =
    Number(value);

  if (Number.isNaN(numericValue)) {
    return '0 km';
  }

  return `${numericValue.toLocaleString(
    'pt-BR',
    {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    },
  )} km`;
}


function formatPercentage(
  value: number | string,
) {
  const numericValue =
    Number(value);

  if (Number.isNaN(numericValue)) {
    return '0%';
  }

  return `${numericValue.toLocaleString(
    'pt-BR',
    {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    },
  )}%`;
}


function formatDifferenceKm(
  value: string,
) {
  const numericValue =
    Number(value);

  if (Number.isNaN(numericValue)) {
    return value;
  }

  const prefix =
    numericValue > 0
      ? '+'
      : '';

  return `${prefix}${numericValue.toLocaleString(
    'pt-BR',
    {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    },
  )} km`;
}


function formatDifferencePercent(
  value: string,
) {
  const numericValue =
    Number(value);

  if (Number.isNaN(numericValue)) {
    return value;
  }

  const prefix =
    numericValue > 0
      ? '+'
      : '';

  return `${prefix}${numericValue.toLocaleString(
    'pt-BR',
    {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    },
  )}%`;
}


function getBadgeStatus(
  audit: RouteAudit,
):
  | 'NORMAL'
  | 'ATTENTION'
  | 'DIVERGENCE'
  | 'JUSTIFIED' {
  return audit.status;
}


export default function DashboardScreen({
  navigation,
}: Props) {
  const {
    user,
    signOut,
  } = useAuth();


  const [dashboard, setDashboard] =
    useState<DashboardData | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);


  const roleName =
    user?.role?.name ??
    'Sem perfil';


  const displayName =
    user?.first_name ||
    user?.username ||
    'Usuário';


  const canViewManagementDashboard =
    roleName === 'Administrador' ||
    roleName === 'Gestor' ||
    roleName === 'Diretor';


  const loadDashboard =
    useCallback(async () => {
      if (
        !canViewManagementDashboard
      ) {
        setLoading(false);
        return;
      }

      try {
        setError(null);

        const data =
          await getDashboard();

        setDashboard(data);

      } catch (err: any) {
        console.error(
          'Erro ao carregar dashboard:',
          err?.response?.data ??
            err,
        );

        if (
          err?.response?.status === 403
        ) {
          setError(
            'Seu perfil não possui permissão para visualizar o dashboard gerencial.',
          );

        } else {
          setError(
            'Não foi possível carregar os dados do dashboard.',
          );
        }

      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, [
      canViewManagementDashboard,
    ]);


  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);


  function handleRefresh() {
    if (
      !canViewManagementDashboard
    ) {
      return;
    }

    setRefreshing(true);
    loadDashboard();
  }


  function openAuditList() {
    /*
     * Uma auditoria pertence a uma viagem.
     *
     * Portanto o acesso geral leva primeiro
     * para a lista de viagens.
     *
     * Depois o usuário escolhe qual viagem
     * deseja auditar.
     */
    navigation.navigate(
      'Trips',
    );
  }


  function renderActions() {
    switch (roleName) {
      case 'Administrador':
        return (
          <>
            <DashboardCard
              title="Viagens"
              description="Consultar e acompanhar todas as viagens."
              onPress={() =>
                navigation.navigate(
                  'Trips',
                )
              }
            />

            <DashboardCard
              title="Veículos"
              description="Consultar a frota cadastrada."
              onPress={() =>
                navigation.navigate(
                  'Vehicles',
                )
              }
            />
            <DashboardCard
  title="Funcionários"
  description="Cadastrar e gerenciar os acessos da equipe."
  onPress={() =>
    navigation.navigate(
      'Employees',
    )
  }
/>

            <DashboardCard
              title="Auditoria"
              description="Selecione uma viagem para analisar rotas e divergências."
              onPress={
                openAuditList
              }
            />

            <DashboardCard
              title="Iniciar viagem"
              description="Registrar um novo deslocamento."
              onPress={() =>
                navigation.navigate(
                  'StartTrip',
                )
              }
            />
          </>
        );


      case 'Gestor':
        return (
          <>
            <DashboardCard
              title="Viagens"
              description="Acompanhar viagens da operação."
              onPress={() =>
                navigation.navigate(
                  'Trips',
                )
              }
            />

            <DashboardCard
              title="Veículos"
              description="Consultar a frota."
              onPress={() =>
                navigation.navigate(
                  'Vehicles',
                )
              }
            />

            <DashboardCard
              title="Auditoria"
              description="Selecione uma viagem para analisar divergências."
              onPress={
                openAuditList
              }
            />
          </>
        );


      case 'Diretor':
        return (
          <>
            <DashboardCard
              title="Viagens"
              description="Consultar viagens registradas."
              onPress={() =>
                navigation.navigate(
                  'Trips',
                )
              }
            />

            <DashboardCard
              title="Auditoria"
              description="Selecione uma viagem para consultar seus indicadores."
              onPress={
                openAuditList
              }
            />

            <DashboardCard
              title="Veículos"
              description="Consultar informações da frota."
              onPress={() =>
                navigation.navigate(
                  'Vehicles',
                )
              }
            />
          </>
        );


      case 'Motorista':
        return (
          <>
            <DashboardCard
              title="Minhas viagens"
              description="Consultar seus deslocamentos."
              onPress={() =>
                navigation.navigate(
                  'Trips',
                )
              }
            />

            <DashboardCard
              title="Iniciar viagem"
              description="Registrar o início de um deslocamento."
              onPress={() =>
                navigation.navigate(
                  'StartTrip',
                )
              }
            />
          </>
        );


      default:
        return (
          <View
            style={styles.warning}
          >
            <Text
              style={
                styles.warningTitle
              }
            >
              Perfil não configurado
            </Text>

            <Text
              style={
                styles.warningText
              }
            >
              Procure um administrador
              do sistema.
            </Text>
          </View>
        );
    }
  }


  function renderRecentAudit(
    audit: RouteAudit,
  ) {
    return (
      <TouchableOpacity
        key={audit.id}
        style={styles.recentCard}
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate(
            'Audit',
            {
              tripId:
                audit.trip_id,
            },
          )
        }
      >

        <View
          style={
            styles.recentTop
          }
        >

          <View
            style={
              styles.recentTextArea
            }
          >
            <Text
              style={
                styles.recentVehicle
              }
            >
              {audit.vehicle_plate}
            </Text>

            <Text
              style={
                styles.recentDriver
              }
            >
              {audit.driver_username}
            </Text>

            <Text
              style={
                styles.recentRoute
              }
            >
              {audit.origin}
              {' → '}
              {audit.destination}
            </Text>
          </View>


          <StatusBadge
            status={
              getBadgeStatus(
                audit,
              )
            }
          />

        </View>


        <View
          style={
            styles.routeNumbers
          }
        >

          <View>
            <Text
              style={
                styles.metricLabel
              }
            >
              Rota padrão
            </Text>

            <Text
              style={
                styles.routeText
              }
            >
              {formatKm(
                audit.standard_distance_km,
              )}
            </Text>
          </View>


          <View>
            <Text
              style={
                styles.metricLabel
              }
            >
              Real
            </Text>

            <Text
              style={
                styles.routeText
              }
            >
              {formatKm(
                audit.gps_distance_km,
              )}
            </Text>
          </View>

        </View>


        <Text
          style={[
            styles.difference,

            Number(
              audit.difference_km,
            ) <= 0
              ? styles.negativeDifference
              : styles.positiveDifference,
          ]}
        >
          {formatDifferenceKm(
            audit.difference_km,
          )}

          {' • '}

          {formatDifferencePercent(
            audit.difference_percent,
          )}
        </Text>


        <Text
          style={
            styles.routeName
          }
        >
          {audit.route_name}
        </Text>

      </TouchableOpacity>
    );
  }


  return (
    <SafeAreaView
      style={styles.container}
    >

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              handleRefresh
            }
          />
        }
      >

        <ScreenHeader
          title="AuditKM"
          subtitle={
            `Olá, ${displayName} • ${roleName}`
          }
        />


        <View
          style={
            styles.accountRow
          }
        >

          <Text
            style={
              styles.accountText
            }
          >
            Painel operacional
          </Text>


          <TouchableOpacity
            style={
              styles.logoutButton
            }
            onPress={
              signOut
            }
          >
            <Text
              style={
                styles.logoutText
              }
            >
              Sair
            </Text>
          </TouchableOpacity>

        </View>


        {canViewManagementDashboard && (
          <>
            <Text
              style={
                styles.sectionTitle
              }
            >
              Visão geral
            </Text>


            {loading ? (
              <View
                style={
                  styles.loadingBox
                }
              >
                <ActivityIndicator />

                <Text
                  style={
                    styles.loadingText
                  }
                >
                  Carregando indicadores...
                </Text>
              </View>

            ) : error ? (
              <View
                style={
                  styles.errorBox
                }
              >
                <Text
                  style={
                    styles.errorText
                  }
                >
                  {error}
                </Text>

                <TouchableOpacity
                  onPress={
                    loadDashboard
                  }
                >
                  <Text
                    style={
                      styles.retryText
                    }
                  >
                    Tentar novamente
                  </Text>
                </TouchableOpacity>
              </View>

            ) : dashboard ? (
              <>
                <View
                  style={
                    styles.metricsRow
                  }
                >

                  <View
                    style={
                      styles.metric
                    }
                  >
                    <DashboardCard
                      title="KM auditados"
                      value={formatKm(
                        dashboard.audited_km,
                      )}
                      description="Distância GPS auditada"
                    />
                  </View>


                  <View
                    style={
                      styles.metric
                    }
                  >
                    <DashboardCard
                      title="Viagens"
                      value={String(
                        dashboard.trips,
                      )}
                      description="Viagens auditadas"
                    />
                  </View>

                </View>


                <View
                  style={
                    styles.metricsRow
                  }
                >

                  <View
                    style={
                      styles.metric
                    }
                  >
                    <DashboardCard
                      title="Divergências"
                      value={String(
                        dashboard.divergences,
                      )}
                      description="Viagens divergentes"
                    />
                  </View>


                  <View
                    style={
                      styles.metric
                    }
                  >
                    <DashboardCard
                      title="Regularidade"
                      value={
                        formatPercentage(
                          dashboard.regularity_percent,
                        )
                      }
                      description="Dentro da rota padrão"
                    />
                  </View>

                </View>
              </>

            ) : null}
          </>
        )}


        <Text
          style={
            styles.sectionTitle
          }
        >
          Acesso rápido
        </Text>


        {renderActions()}


        {canViewManagementDashboard &&
          !loading &&
          !error &&
          dashboard && (
            <View
              style={
                styles.recentSection
              }
            >

              <Text
                style={
                  styles.sectionTitle
                }
              >
                Auditorias recentes
              </Text>


              {dashboard
                .recent_audits
                .length === 0 ? (
                <EmptyState
                  title="Nenhuma auditoria"
                  description="Ainda não existem viagens auditadas para exibir."
                />

              ) : (
                dashboard
                  .recent_audits
                  .map(
                    renderRecentAudit,
                  )
              )}

            </View>
          )}

      </ScrollView>

    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },

  content: {
    padding: 18,
    paddingBottom: 40,
  },

  accountRow: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },

  accountText: {
    color: '#607D8B',
    fontWeight: '600',
  },

  logoutButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },

  logoutText: {
    color: '#455A64',
    fontWeight: '600',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 12,
    marginTop: 8,
  },

  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },

  metric: {
    flex: 1,
  },

  loadingBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 22,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },

  loadingText: {
    marginLeft: 10,
    color: '#607D8B',
  },

  errorBox: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
  },

  errorText: {
    color: '#C62828',
    lineHeight: 20,
  },

  retryText: {
    marginTop: 10,
    color: '#0D47A1',
    fontWeight: 'bold',
  },

  warning: {
    backgroundColor: '#FFF8E1',
    padding: 18,
    borderRadius: 12,
  },

  warningTitle: {
    color: '#F57F17',
    fontWeight: 'bold',
  },

  warningText: {
    marginTop: 5,
    color: '#795548',
  },

  recentSection: {
    marginTop: 14,
  },

  recentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 17,
    marginBottom: 12,
  },

  recentTop: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'flex-start',
  },

  recentTextArea: {
    flex: 1,
    marginRight: 12,
  },

  recentVehicle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#263238',
  },

  recentDriver: {
    marginTop: 3,
    color: '#78909C',
    fontSize: 12,
  },

  recentRoute: {
    marginTop: 5,
    color: '#607D8B',
  },

  routeNumbers: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent:
      'space-between',
  },

  metricLabel: {
    color: '#90A4AE',
    fontSize: 11,
  },

  routeText: {
    marginTop: 3,
    color: '#455A64',
    fontWeight: '600',
  },

  difference: {
    marginTop: 12,
    fontWeight: 'bold',
  },

  positiveDifference: {
    color: '#C62828',
  },

  negativeDifference: {
    color: '#EF6C00',
  },

  routeName: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ECEFF1',
    fontSize: 12,
    color: '#90A4AE',
  },
});